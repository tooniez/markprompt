import mitt from 'mitt';

export const EVENT_OPEN_CHAT = 'EVENT_OPEN_CHAT';

const emitter = mitt();

export default emitter;
