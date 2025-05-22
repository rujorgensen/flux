/**
 * Example of using the latest value feature in FluxNetworkChannel.
 */

import { FluxNetworkChannel } from '../lib/flux-network-channel.class';
import { type TNetworkAgentCountAt } from '@flux/shared/types';

// This is a hypothetical example showing how to use the latest value feature
async function exampleUsage(fluxNetworkChannel: FluxNetworkChannel) {
  // 1. Subscribe to channel updates
  fluxNetworkChannel.onPublish((message: string) => {
    console.log('Received new message:', message);
  });

  // 2. You can publish messages to the channel
  fluxNetworkChannel.publish('Hello channel!');

  // 3. At any time, you can get the latest value that was published on the channel
  const latestValue = fluxNetworkChannel.getLatestValue<string>();
  console.log('Latest value:', latestValue); // Will output: Latest value: Hello channel!

  // 4. When working with typed channels, you can specify the type in getLatestValue
  // For example, with the active-channels example from the codebase:
  const networkChannel = fluxNetworkChannel; // Just reusing for example
  
  // After receiving messages
  const latestCountAt = networkChannel.getLatestValue<TNetworkAgentCountAt>();
  if (latestCountAt) {
    console.log(`Latest active channel count: ${latestCountAt.count} at ${latestCountAt.date}`);
  }
}

// Note: This is just an example and not meant to be executed directly