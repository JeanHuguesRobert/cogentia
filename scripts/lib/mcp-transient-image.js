// A request-scoped handoff. No global map of image bytes and no serialized
// property. The result object remains the sole lifetime owner.
const imageKey=Symbol('transient MCP image');
export function attachTransientImage(result,image){
 if(!result||result.ok!==true||image?.type!=='image')throw Error('transient_image_invalid');
 Object.defineProperty(result,imageKey,{value:image,enumerable:false,configurable:true});
 return result;
}
export function takeTransientImage(result){
 const image=result?.[imageKey];
 if(image)delete result[imageKey];
 return image;
}
