import { KernelMessage } from "@jupyterlab/services";
import * as base from "@jupyter-widgets/base";
import * as controls from "@jupyter-widgets/controls";
import {
  DOMWidgetView,
  WidgetModel,
  WidgetView,
  DOMWidgetModel,
  ModelOptions,
  ISerializers
} from "@jupyter-widgets/base";
import { WidgetComm } from "./widget-comms";
import { Dispatch } from "redux";
import { connect } from "react-redux";

export class WidgetManager extends base.ManagerBase<DOMWidgetView> {
  model_comm_lookup: (id: string)=>any;
  kernel: any;

  constructor(kernel: any, model_comm_lookup: (id: string)=>any) {
    super();
    this.kernel = kernel;
    this.model_comm_lookup = model_comm_lookup;
  }

  update(kernel: any, model_comm_lookup: (id: string)=>any) {
    this.kernel = kernel;
    this.model_comm_lookup = model_comm_lookup;
  }

  /**
   * Load a class and return a promise to the loaded object.
   */
  loadClass(className: string, moduleName: string, moduleVersion: string): any {
    return new Promise(function(resolve, reject) {
      if (moduleName === "@jupyter-widgets/controls") {
        resolve(controls);
      } else if (moduleName === "@jupyter-widgets/base") {
        resolve(base);
      } else {
        return Promise.reject(
          `Module ${moduleName}@${moduleVersion} not found`
        );
      }
    }).then(function(module: any) {
      if (module[className]) {
        return module[className];
      } else {
        return Promise.reject(
          `Class ${className} not found in module ${moduleName}@${moduleVersion}`
        );
      }
    });
  }

  /**
   * Get a promise for a model by model id.
   *
   * #### Notes
   * If a model is not found, this will lookup the model in nteracts
   * redux store using the model_comm_lookup funciton and create it
   */
  get_model(model_id: string): Promise<WidgetModel> | undefined {
    let model = super.get_model(model_id);
    if(model === undefined){
      let model_state = this.model_comm_lookup(model_id).state;
      model = this.new_widget_from_state_and_id(model_state, model_id);
    }
    return model;
  }

  async new_model_from_state_and_id(state: any, model_id: string){
    let modelInfo = {
      model_id: model_id,
      model_name: state._model_name,
      model_module: state._model_module,
      model_module_version: state._module_version,
      view_name: state._view_name,
      view_module: state._view_module,
      view_module_version: state._view_module_version
    };
    return this.new_model(modelInfo, state);
  }

  /**
   * Shortcut to new_widget (creates the modelInfo from the state)
   * @param state 
   * @param model_id 
   */
  async new_widget_from_state_and_id(state: any, model_id: string){
    let modelInfo = {
      model_id: model_id,
      model_name: state._model_name,
      model_module: state._model_module,
      model_module_version: state._module_version,
      view_name: state._view_name,
      view_module: state._view_module,
      view_module_version: state._view_module_version
    };
    return this.new_widget(modelInfo, state);
  }

  /**
   * Create a comm and new widget model.
   * @param  options - same options as new_model but comm is not
   *                          required and additional options are available.
   * @param  serialized_state - serialized model attributes.
   */
  new_widget(options: any, serialized_state: any = {}): Promise<WidgetModel>{
    //first we check if the model was already created
    let widget = super.get_model(options.model_id); //we need to use the super because we override get_model to create what it can't find
    if(!widget){
      widget = super.new_widget(options, serialized_state);
    }
    return widget;
  }

  display_view(
    msg: KernelMessage.IMessage,
    view: base.DOMWidgetView,
    options: any
  ): Promise<base.DOMWidgetView> {
    return Promise.resolve(view);
  }

  _get_comm_info() {
    return Promise.resolve({});
  }

  /**
   * Create a comm which can be used for communication for a widget.
   *
   * If the data/metadata is passed in, open the comm before returning (i.e.,
   * send the comm_open message). If the data and metadata is undefined, we
   * want to reconstruct a comm that already exists in the kernel, so do not
   * open the comm by sending the comm_open message.
   *
   * @param comm_target_name Comm target name
   * @param model_id The comm id
   * @param data The initial data for the comm
   * @param metadata The metadata in the open message
   */
  _create_comm(comm_target_name: string,
    model_id: string,
    data?: any,
    metadata?: any,
    buffers?: ArrayBuffer[] | ArrayBufferView[]) {
    //TODO: Check if we need to open a comm
    //TODO: Find a way to supply correct target module (only used in comm opens)
    return Promise.resolve(new WidgetComm(model_id, this.comm_target_name, "<target module>", this.kernel));
  }
}