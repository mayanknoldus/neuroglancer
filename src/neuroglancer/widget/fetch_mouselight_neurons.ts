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
  segmentId: Array<number>
}

interface AnatomicalJSON {
  segment_names: Array<string>
}

export class FetchMouselightNeuronsWidget extends RefCounted{
  public element: HTMLElement;
  private filterField: HTMLElement;
  private filterFieldSecond: HTMLElement;
  private fetchTitle: HTMLHeadingElement;
  private anatomicalSelection: HTMLSelectElement;
  private anatomicalSelectionDefault: HTMLSelectElement;
  private filterType: HTMLSelectElement;
  private operatorType: HTMLSelectElement;
  private filterThreshold: HTMLInputElement;

  private anatomicalSelectionSecond: HTMLSelectElement;
  private anatomicalSelectionDefaultSecond: HTMLSelectElement;
  private filterTypeSecond: HTMLSelectElement;
  private operatorTypeSecond: HTMLSelectElement;
  private filterThresholdSecond: HTMLInputElement;

  private fetchButton: HTMLElement;

  constructor(public layer: SegmentationUserLayer, public layerName: string) {
    super();
    const buttonText = 'Click to fetch';
    const buttonTitle = 'Fetch mouselight neurons';
    const operatorTypeOptions = [">",">=","<","<=","="];
    const operatorTypeOptionValues = ["gt","gte","lt","lte","exact"];
    const filterTypeOptions = ["axon_endpoints","axon_branches","dendrite_endpoints","dendrite_branches","soma"];

    const atlasName = layerName.split("_mouselight")[0];

    // Make the overall div for this tool
    this.element = document.createElement('div');
    this.element.classList.add('neuroglancer-fetch-mouselight-tool');

    // Title
    this.fetchTitle = document.createElement('h3');
    this.fetchTitle.innerText = "Neuron fetch tool"
    this.fetchTitle.classList.add('neuroglancer-mouselight-tool-title')


    ///////// FILTER #1 /////////
    // Make the div for this fitler (i.e. set of fields)
    this.filterField = document.createElement('div');
    // Filter name field
    const filterTitle = document.createElement('p')
    filterTitle.innerHTML = 'Filter 1'
    filterTitle.classList.add('neuroglancer-mouselight-filter-title')
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

    // Add listener to check if soma is selected. If so, hide the operator type and threshold

    this.filterType.addEventListener(
      'change', () => this.filterChangeHandler(this.filterType));

    filterTypeOptions.forEach((option:string) => {
        const filter_option = document.createElement('option');
        filter_option.value = option;
        filter_option.text = option;
        this.filterType.add(filter_option);
      });

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
    this.setUpAnatomicalRegionsList(atlasName);
    
    // Operator type -- is a dropdown of >, <, >=, <=, =, 
    this.operatorType = document.createElement('select');
    this.operatorType.classList.add('neuroglancer-fetch-mouselight-selection');
 
    // eslint-disable-next-line no-var
    for(var i = 0; i < operatorTypeOptions.length; i++) {
        const filter_option = document.createElement('option');
        filter_option.text = operatorTypeOptions[i];
        filter_option.value = operatorTypeOptionValues[i];
        this.operatorType.add(filter_option);
    }
    // Filter Threshold -- numeric input
    this.filterThreshold = document.createElement('input');
    this.filterThreshold.type = 'text'
    this.filterThreshold.placeholder = 'Threshold (integer)'
    this.filterThreshold.classList.add('neuroglancer-fetch-mouselight-threshold');

    // Second filter checkbox 
    const secondFilterCheckboxElement = document.createElement('div');
    secondFilterCheckboxElement.classList.add('neuroglancer-mouselight-newfilter-checkbox')
    const secondFilterCheckbox = document.createElement('input');
    secondFilterCheckbox.type = 'checkbox';
    secondFilterCheckbox.addEventListener(
      'change', () => this.checkboxHandler(secondFilterCheckbox));

    const secondFilterCheckboxText = document.createElement('p');
    secondFilterCheckboxText.innerHTML = 'Add another filter';
    secondFilterCheckboxElement.appendChild(secondFilterCheckbox);
    secondFilterCheckboxElement.appendChild(secondFilterCheckboxText);
    // Add child elements to parent filter element
    this.filterField.appendChild(this.fetchTitle);
    this.filterField.appendChild(filterTitle);
    this.filterField.appendChild(this.filterType);
    this.filterField.appendChild(this.anatomicalSelection);
    this.filterField.appendChild(this.operatorType);
    this.filterField.appendChild(this.filterThreshold);
    this.filterField.appendChild(secondFilterCheckboxElement);


    ///////// FILTER #2, hidden by default /////////
    this.filterFieldSecond = document.createElement('div');
    this.filterFieldSecond.style.display = "none";

    // Filter name field
    const filterTitleSecond = document.createElement('p');
    filterTitleSecond.innerHTML = 'Filter 2';
    filterTitleSecond.classList.add('neuroglancer-mouselight-filter-title');
    
    // filter type -- e.g. "axonal end point" ,
    // "axonal branch point", "soma", etc..
    this.filterTypeSecond = document.createElement('select');
    this.filterTypeSecond.classList.add('neuroglancer-fetch-mouselight-selection');
    const defaultOptionFilterTypeSecond = document.createElement('option');
    defaultOptionFilterTypeSecond.text = 'Select neuron part';
    defaultOptionFilterTypeSecond.value = '';
    defaultOptionFilterTypeSecond.disabled = true;
    defaultOptionFilterTypeSecond.selected = true;
    this.filterTypeSecond.add(defaultOptionFilterTypeSecond);

    // Add listener to check if soma is selected. If so, hide the operator type and threshold

    this.filterTypeSecond.addEventListener(
      'change', () => this.filterChangeHandler(this.filterTypeSecond));

    filterTypeOptions.forEach((option:string) => {
        const filter_option = document.createElement('option');
        filter_option.value = option;
        filter_option.text = option;
        this.filterTypeSecond.add(filter_option);
      });

    // Anatomical region
    this.anatomicalSelectionDefaultSecond = document.createElement('select');
    this.anatomicalSelectionDefaultSecond.classList.add('neuroglancer-fetch-mouselight-selection');
    const defaultOptionSecond = document.createElement('option');
    defaultOptionSecond.text = 'Loading anatomical regions';
    defaultOptionSecond.value = '';
    defaultOptionSecond.disabled = true;
    defaultOptionSecond.selected = true;
    this.anatomicalSelectionDefaultSecond.add(defaultOptionSecond);
    this.anatomicalSelectionSecond = this.anatomicalSelectionDefaultSecond;
    
    // Operator type -- is a dropdown of >, <, >=, <=, =, 
    this.operatorTypeSecond = document.createElement('select');
    this.operatorTypeSecond.classList.add('neuroglancer-fetch-mouselight-selection');
    // eslint-disable-next-line no-var
    for(var i = 0; i < operatorTypeOptions.length; i++) {
        const filter_option = document.createElement('option');
        filter_option.text = operatorTypeOptions[i];
        filter_option.value = operatorTypeOptionValues[i];
        this.operatorTypeSecond.add(filter_option);
    }
    // Filter Threshold -- numeric input
    this.filterThresholdSecond = document.createElement('input');
    this.filterThresholdSecond.type = 'text'
    this.filterThresholdSecond.placeholder = 'Threshold (integer)'
    this.filterThresholdSecond.classList.add('neuroglancer-fetch-mouselight-threshold');
    // 
    this.filterFieldSecond.appendChild(filterTitleSecond);
    this.filterFieldSecond.appendChild(this.filterTypeSecond);
    this.filterFieldSecond.appendChild(this.anatomicalSelectionSecond);
    this.filterFieldSecond.appendChild(this.operatorTypeSecond);
    this.filterFieldSecond.appendChild(this.filterThresholdSecond);

    // SUBMIT QUERY BUTTON
    this.fetchButton = makeIcon({
      text: buttonText,
      title: buttonTitle,
      onClick: () => {this.fetchNeurons(atlasName)},
    });
    
    this.fetchButton.classList.add('neuroglancer-fetch-mouselight-button');

    // Now add all child elements to parent filter 
    this.element.appendChild(this.filterField);
    this.element.appendChild(this.filterFieldSecond);
    this.element.appendChild(this.fetchButton);
    this.registerDisposer(() => removeFromParent(this.element));
  }

  private filterChangeHandler(elem: HTMLSelectElement) {
    if (elem.value == 'soma') {
      this.operatorType.style.display = "none";
      this.filterThreshold.style.display = "none";
    }
    else {
      this.operatorType.style.display = "block";
      this.filterThreshold.style.display = "block";
    }
  }

  private checkboxHandler(elem: HTMLInputElement) {
    if (elem.checked) {
      this.filterFieldSecond.style.display = "block";
    }
    else {
      this.filterFieldSecond.style.display = "none";
    }
  }

  async setUpAnatomicalRegionsList(atlasName: string) {

      const anatomicalURL = `${AppSettings.API_ENDPOINT}/anatomical_regions/${atlasName}`;
      try {
        const anatomicalJSON:AnatomicalJSON = await fetchOk(anatomicalURL, {
          method: 'GET',
        }).then(response => {
          return response.json();
        });

      // Make new select element and fill with anatomical regions we fetched from API
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

      
      const mouselightAnatomicalRegionsSecond = <HTMLSelectElement>mouselightAnatomicalRegions.cloneNode(true);
      mouselightAnatomicalRegionsSecond.value = '';
      // Filter #2, replace the anatomical regions select element with this new element
      this.anatomicalSelectionDefault.parentNode?.replaceChild(
        mouselightAnatomicalRegions, this.anatomicalSelectionDefault);

      // Filter #2, make new div and replace the anatomical regions select with this new element
      this.anatomicalSelectionDefaultSecond.parentNode?.replaceChild(
        mouselightAnatomicalRegionsSecond, this.anatomicalSelectionDefaultSecond);
      // const mouselightElementFetchedSecond = document.createElement('div');
      // mouselightElementFetchedSecond.classList.add('neuroglancer-fetch-mouselight-tool');
      // mouselightElementFetchedSecond.appendChild(this.fetchTitleSecond);
      // mouselightElementFetchedSecond.appendChild(this.filterTypeSecond);
      // mouselightElementFetchedSecond.appendChild(mouselightAnatomicalRegionsSecond);
      // mouselightElementFetchedSecond.appendChild(this.operatorTypeSecond);
      // mouselightElementFetchedSecond.appendChild(this.filterThresholdSecond);
      // this.element.parentNode?.replaceChild(mouselightElementFetchedSecond, this.elementSecond);
      // this.anatomicalSelectionSecond = mouselightAnatomicalRegions;

        
      } catch (e) {
        StatusMessage.showTemporaryMessage('Failed to load list of anatomical regions');
      }
  }

  async fetchNeurons(atlasName: string) {
      const filterType = this.filterType.value;
      const operatorType = this.operatorType.value;
      const anatomicalSelection = this.anatomicalSelection.value;
      if (!anatomicalSelection) {
        StatusMessage.showTemporaryMessage('Please select an anatomical region');
        return;
      }
      let neuronURL = `${AppSettings.API_ENDPOINT}/mlneurons/${atlasName}/${anatomicalSelection}`
      if (filterType == 'soma') {
        neuronURL += '/soma';
      }

      else {
        const filterThreshold = this.filterThreshold.value;
        if (!filterThreshold) {
          StatusMessage.showTemporaryMessage('Please select a threshold');
          return;
        }
        neuronURL += `/${filterType}/${operatorType}/${filterThreshold}`;
      }
      StatusMessage.showTemporaryMessage('Fetching mouselight neurons...');
      
      try {
        const neuronJSON:NeuronJSON = await fetchOk(neuronURL, {
          method: 'GET',
        }).then(response => {
          return response.json();
        });
        const group = this.layer.displayState.segmentationGroupState.value;
        // let counter = 0;
        const n_neurons_fetched = neuronJSON.segmentId.length/3;
        neuronJSON.segmentId.forEach((segid:number) => {
          const id = new Uint64(segid);

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