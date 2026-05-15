import { NPCDialogueManager } from './npc-dialogue-manager.class';

const MESH_NPC_RANDOM_MESSAGES: readonly string[] = [
    'Steel yourself, traveler. Strange currents stir beyond these gates.',
    'Every signal leaves a trail. Mind which ones you choose to follow.',
    'I have watched green recruits chase glory into the dark and never return.',
    'The mesh is restless today. Even the quiet channels feel like a warning.',
    'Keep your wits sharp and your blade sharper. This road favors neither fools nor dreamers.',
];

const MESH_NPC_FINAL_MESSAGE =
    'I have shared all the wisdom I can spare. The next step is yours alone, hero.';

const MESH_NPC_RANDOM_INTERACTION_LIMIT = 3;

export const createMeshNPCDialogueManager = (
    randomNumberGenerator: () => number = Math.random,
): NPCDialogueManager =>
    new NPCDialogueManager(
        MESH_NPC_RANDOM_MESSAGES,
        MESH_NPC_FINAL_MESSAGE,
        MESH_NPC_RANDOM_INTERACTION_LIMIT,
        randomNumberGenerator,
    );
