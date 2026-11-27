/** Non-secret text editing: semantic operation distinct from transport.
 * These are the currently supported input-type subsets, not claims that
 * any browser can edit every such element. The executor rechecks the DOM.
 * 2026-11-27, #291 / #349.
 */
const insert=Object.freeze(['text','email','search','tel','url','number']);
const replace=Object.freeze(['text','search','tel','url']);
export const TEXT_EDIT_PROFILES=Object.freeze({
 'legacy-cdp-insert':Object.freeze({operation:'insert-at-selection',formPlan:true,inputTypes:insert}),
 'dom-replace':Object.freeze({operation:'replace-all',formPlan:true,inputTypes:replace}),
 'bidi-native-insert':Object.freeze({operation:'insert-at-selection',formPlan:false,inputTypes:replace}),
});
export function textEditProfile(name){
 if(!Object.hasOwn(TEXT_EDIT_PROFILES,name))throw Error('unknown_text_edit_profile');
 return TEXT_EDIT_PROFILES[name];
}
export function supportsTextInput(profile,type){
 return textEditProfile(profile).inputTypes.includes(type);
}
