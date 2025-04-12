// import Bun from 'bun';

// export const authHttpHandler = (
//     request: Request,
//     _server: Bun.Server,
// ) => {
//     console.log(request.method, request.method,);
//     if (request.method === 'OPTIONS') {
//         return new Response(null, {
//             status: 204,
//             headers: {
//                 'Access-Control-Allow-Origin': '*',
//                 // 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//                 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//                 // 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//                 'Access-Control-Allow-Headers': 'Content-Type, x-flux-content-type, Set-Cookie',
//             }
//         });
//     }

// };
