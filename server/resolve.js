// Facade de resolución y proxy para links multimedia (Cuevana, YouTube, Cloud, HLS)
export { classify } from './resolvers/classify.js';
export { proxyHls } from './resolvers/hlsProxy.js';
export { streamLink } from './resolvers/streamLink.js';
export { resolveCuevana } from './resolvers/cuevana.js';
export { youtubeId, youtubePlaylistId, resolveYoutubePlaylist } from './resolvers/youtube.js';
