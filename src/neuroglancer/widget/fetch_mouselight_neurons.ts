import './fetch_mouselight_neurons.css';
import {StatusMessage} from 'neuroglancer/status';
import {RefCounted} from 'neuroglancer/util/disposable';
import {removeFromParent} from 'neuroglancer/util/dom';
import {fetchOk} from 'neuroglancer/util/http_request';
import {makeIcon} from 'neuroglancer/widget/icon';
import {AppSettings} from 'neuroglancer/services/service';
import type {SegmentationUserLayer} from 'neuroglancer/segmentation_user_layer';
import {Uint64} from 'neuroglancer/util/uint64';

interface NeuronJSON {
  segmentId: Array<Number>
};

interface AnatomicalJSON {
  segment_names: Array<string>
};

export class FetchMouselightNeuronsWidget extends RefCounted{
  element: HTMLElement;
  private fetchButton: HTMLElement;
  private fetchTitle: HTMLHeadingElement;
  private anatomicalSelection: HTMLSelectElement;
  private anatomicalSelectionDefault: HTMLSelectElement;
  private filterType: HTMLSelectElement;
  private operatorType: HTMLSelectElement;
  private filterThreshold: HTMLInputElement;

  constructor(public layer: SegmentationUserLayer) {
    super();
    const buttonText = 'Click to fetch';
    const buttonTitle = 'Fetch mouselight neurons';

    // Mouselight query section
    // Title
    this.fetchTitle = document.createElement('h3');
    this.fetchTitle.innerText = "Neuron fetch tool"
    this.fetchTitle.align = "Center"

    // Anatomical region
    this.anatomicalSelectionDefault = document.createElement('select');
    this.anatomicalSelectionDefault.classList.add('neuroglancer-fetch-mouselight-selection');
    const defaultOption = document.createElement('option');
    defaultOption.text = 'Loading anatomical regions';
    defaultOption.value = '';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    this.anatomicalSelectionDefault.add(defaultOption);
    this.anatomicalSelection = this.anatomicalSelectionDefault;
    this.setUpAnatomicalRegionsList()
    // query type

    // filter type -- e.g. "axonal end point" ,
    // "axonal branch point", "soma", etc..
    this.filterType = document.createElement('select');
    this.filterType.classList.add('neuroglancer-fetch-mouselight-selection');
    const defaultOptionFilterType = document.createElement('option');
    defaultOptionFilterType.text = 'Select neuron part';
    defaultOptionFilterType.value = '';
    defaultOptionFilterType.disabled = true;
    defaultOptionFilterType.selected = true;
    this.filterType.add(defaultOptionFilterType);

    let filterTypeOptions = ["axon_endpoints","axon_branches","dendrite_endpoints","dendrite_branches","soma"];
    filterTypeOptions.forEach((option:string) => {
        const filter_option = document.createElement('option');
        filter_option.value = option;
        filter_option.text = option;
        this.filterType.add(filter_option);
      });
    // Operator type -- is a dropdown of >, <, >=, <=, =, 
    this.operatorType = document.createElement('select');
    this.operatorType.classList.add('neuroglancer-fetch-mouselight-selection');
    let operatorTypeOptions = [">",">=","<","<=","="];
    let operatorTypeOptionValues = ["gt","gte","lt","lte","exact"];
    for(var i = 0; i < operatorTypeOptions.length; i++) {
        const filter_option = document.createElement('option');
        filter_option.text = operatorTypeOptions[i];
        filter_option.value = operatorTypeOptionValues[i];
        this.operatorType.add(filter_option);
    };
    // Filter Threshold -- numeric input
    this.filterThreshold = document.createElement('input');
    this.filterThreshold.type = 'text'
    this.filterThreshold.placeholder = 'Threshold (integer)'
    this.filterThreshold.classList.add('neuroglancer-fetch-mouselight-threshold');
    // SUBMIT QUERY BUTTON
    this.fetchButton = makeIcon({
      text: buttonText,
      title: buttonTitle,
      onClick: () => {this.fetchNeurons()},
    });
    
    this.fetchButton.classList.add('neuroglancer-fetch-mouselight-button');

    this.element = document.createElement('div');
    this.element.classList.add('neuroglancer-fetch-mouselight-tool');
    this.element.appendChild(this.fetchTitle);
    this.element.appendChild(this.filterType);
    this.element.appendChild(this.anatomicalSelection);
    this.element.appendChild(this.operatorType);
    this.element.appendChild(this.filterThreshold);
    this.element.appendChild(this.fetchButton);
    this.registerDisposer(() => removeFromParent(this.element));

  }

  async setUpAnatomicalRegionsList() {

      const anatomicalURL = `${AppSettings.API_ENDPOINT}/anatomical_regions/`;
      try {
        const anatomicalJSON:AnatomicalJSON = await fetchOk(anatomicalURL, {
          method: 'GET',
        }).then(response => {
          return response.json();
        });

      const mouselightAnatomicalRegions = document.createElement('select');
      mouselightAnatomicalRegions.classList.add('neuroglancer-fetch-mouselight-selection');
      const defaultOption = document.createElement('option');
        defaultOption.text = 'Select anatomical region';
        defaultOption.value = '';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.classList.add('default')
        mouselightAnatomicalRegions.add(defaultOption);
      
      const segment_names = anatomicalJSON.segment_names;
      segment_names.forEach((segment_name:string) => {
        const option = document.createElement('option');
        option.value = segment_name;
        option.text = segment_name;
        mouselightAnatomicalRegions.add(option);
      });

      const mouselightElementFetched = document.createElement('div');
      mouselightElementFetched.classList.add('neuroglancer-fetch-mouselight-tool');
      mouselightElementFetched.appendChild(this.fetchTitle);
      mouselightElementFetched.appendChild(this.filterType);
      mouselightElementFetched.appendChild(mouselightAnatomicalRegions);
      mouselightElementFetched.appendChild(this.operatorType);
      mouselightElementFetched.appendChild(this.filterThreshold);
      mouselightElementFetched.appendChild(this.fetchButton);
      this.element.parentNode?.replaceChild(mouselightElementFetched, this.element);
      this.anatomicalSelection = mouselightAnatomicalRegions;

        
      } catch (e) {
        StatusMessage.showTemporaryMessage('Failed to load list of anatomical regions');
      }
  }

  async fetchNeurons() {
      const filterType = this.filterType.value;
      const operatorType = this.operatorType.value;
      const anatomicalSelection = this.anatomicalSelection.value;
      if (!anatomicalSelection) {
        StatusMessage.showTemporaryMessage('Please select an anatomical region');
        return;
      }
      const filterThreshold = this.filterThreshold.value;
      if (!filterThreshold) {
        StatusMessage.showTemporaryMessage('Please select a threshold');
        return;
      }
      StatusMessage.showTemporaryMessage('Fetching mouselight neurons...');
      const neuronURL = `${AppSettings.API_ENDPOINT}/mlneurons/${anatomicalSelection}/${filterType}/${operatorType}/${filterThreshold}`;
      console.log(neuronURL);
      try {
        const neuronJSON:NeuronJSON = await fetchOk(neuronURL, {
          method: 'GET',
        }).then(response => {
          return response.json();
        });
        console.log(neuronJSON);
        const group = this.layer.displayState.segmentationGroupState.value;
        // let counter = 0;
        let n_neurons_fetched = neuronJSON.segmentId.length/3;
        neuronJSON.segmentId.forEach((segid:number) => {
          // console.log(id);
          let id = new Uint64(segid);
          console.log(id);
          // console.log(id);
          // counter +=1;

          group.visibleSegments.add(id);
          // const option = document.createElement('option');
          // option.value = `${prep_id}/${encodeURIComponent(layer)}/${input_type_id}`;
          // option.text = `${prep_id}/${layer}/${input_type}`;
          // annotationSelectionFetched.add(option);
        });
        StatusMessage.showTemporaryMessage(`Successfully fetched ${n_neurons_fetched}  mouselight neurons`,3000);
        
        } catch (e) {
          StatusMessage.showTemporaryMessage('Unable to fetch the mouselight neurons');
          throw e;
        }
    }

}