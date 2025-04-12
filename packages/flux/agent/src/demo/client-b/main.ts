import Alpine from 'alpinejs';
import { FluxAgent } from '../../lib/flux';
import { TNetworkId_S } from '@flux/shared';
// import { Todo } from '../_persistica/client/todo.class.js';
// import {
//     type CurrentNetworkStore,
//     Persistica,
// } from '@persistica';
// import type {
//     INetworkState,
//     TLocalStoreState,
//     TSynchronizerState,
// } from '@persistica/core';
// import type { ITodo } from '../_persistica/todo.primitives.js';
// import type { TConnectionState } from 'src/lib/core/engine/websocket/websocket.client.js';
// import type { THandshakeState } from 'src/lib/core/engine/network/network.class.js';


const flux: FluxAgent = new FluxAgent(
    'network-id' as unknown as TNetworkId_S,
    {
        //         domain?: string,
        //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
        //         retries?: number; // Number of times to retry a failed message
    },
);

// Define observable component
Alpine.data('todoApplication', () => ({
    // persistica: todo,

    message: '',
    //   todos: <ITodo[]>[],
    init() {
        console.log('🚀 Todo Application is live');

        // todo.storeState$$
        //     .subscribe({
        //         next: (storeState: TLocalStoreState) => {
        //             console.log('storeState updated', storeState);
        //             this.storeState = storeState;
        //         },
        //     });

        // todo.networkState$$
        //     .subscribe({
        //         next: (networkState: THandshakeState) => {
        //             console.log('networkState updated', networkState);
        //             this.networkState = networkState;
        //         },
        //     });

        // todo.synchronizerState$$
        //     .subscribe({
        //         next: (synchronizerState: TSynchronizerState) => {
        //             console.log('synchronizerState updated', synchronizerState);
        //             this.synchronizerState = synchronizerState;
        //         },
        //     });

        // todo.todoModel.read$$({

        // })
        //     .subscribe({
        //         next: (todos: ITodo[]) => {
        //             this.todos = todos;
        //         },
        //     });

        // setTimeout(() => {
        //     this.persistica.joinNetwork();
        // }, 500);
    },
    enter() {
        // if (this.message.trim() !== "") {
        //     todo.todoModel.create({
        //         id: Math.floor(Math.random() * 10000),
        //         description: this.message.trim(),
        //         isCompleted: false,
        //         priority: 'NORMAL',
        //         updatedAt: new Date(),
        //         createdAt: new Date(),
        //     })

        //     this.message = "";
        // }
    },

    // remove(
    //     todo_: ITodo,
    // ) {
    //     todo.todoModel.delete(todo_.id);
    // },

    // toggleState(
    //     todo_: ITodo,
    // ) {
    //     todo.todoModel.update({
    //         ...todo_,
    //         isCompleted: !todo_.isCompleted,
    //     })
    // },
}));

console.log('⚙️ Starting alpine');
// Start Alpine.js
Alpine.start();