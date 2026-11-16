/** ChatGPT-specific store: one adapter of the generic conversation local store. */
import {createConversationLocalStore} from './conversation-local-store.mjs';
export const createChatgptLocalStore=(path,options={})=>
  createConversationLocalStore(path,{...options,adapter:'chatgpt-browser'});
