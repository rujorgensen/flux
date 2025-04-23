import { createClient, type RedisClientType } from 'redis';
import {
  type StartedRedisContainer,
  RedisContainer,
} from '@testcontainers/redis';
import { BunRedisPubSub } from './core-redis-pub-sub.class'
import {
  type StartedDockerComposeEnvironment,
  DockerComposeEnvironment,
  GenericContainer,
  StartedTestContainer,
  Wait,
} from 'testcontainers';
import { StartedGenericContainer } from 'testcontainers/build/generic-container/started-generic-container';

describe('BunRedisPubSub', () => {
  let redisContainer: StartedTestContainer; // StartedRedisContainer;
  let redisClient: RedisClientType;
  let pubsub: BunRedisPubSub;
  let environment: StartedDockerComposeEnvironment;

  beforeAll(async () => {
    console.log('');
    //redisContainer = await new RedisContainer('redis:6.2.7')
    //  .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    //  .withExposedPorts(6350)
    //  .withStartupTimeout(10_000)
    //  .withPassword('e2e-redis-password')
    //  .start()
    //  ;
    // const composeFilePath = '.deploy';
    // const composeFile = "docker-compose.e2e.yml";

    // Define the Redis password
    // const REDIS_PASSWORD = 'e2e-redis-password'

    // Start a Redis container with a password and wait strategy

    redisContainer = await new RedisContainer('redis:6.2.7')
      // .withCommand(['redis-server', '--requirepass', 'e2e-redis-password'])
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .start()


    const redisHost = redisContainer.getHost()
    const redisPort = redisContainer.getMappedPort(6379)
    const url = `redis://${redisHost}:${redisPort}`
    console.log(`Redis is ready at ${redisHost}:${redisPort}`)

    //const queryResult = await redisContainer.executeCliCmd("info", ["clients"]);
    //expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));

    // environment = await new DockerComposeEnvironment(composeFilePath, composeFile)

    // .withProjectName('flux-e2e') // required for consistent container naming
    // .withWaitStrategy(
    //   'portal-redis-e2e',
    //   Wait.forLogMessage('Ready to accept connections')
    // )
    // .withExposedService('portal-redis-e2e', 6379) // INTERNAL port
    // .up();


    // redisContainer = await new GenericContainer('redis:6.2.7')
    //   .withCommand(['redis-server', '--requirepass', 'e2e-redis-password'])
    //   .withExposedPorts(6379)
    //   .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    //   .start()
    //   ;
    // environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
    //   .withProjectName('flux-e2e')
    //   // .withWaitStrategy('portal-redis-e2e', Wait.forLogMessage('Ready to accept connections'))
    //   .withWaitStrategy('flux-e2e-portal-redis-e2e', Wait.forLogMessage('Ready to accept connections'))
    //   .up()

    //     const host = 'localhost'; // redisContainer.getHost();
    //     const port = 6350; // redisContainer.getMappedPort(6379);
    // 
    //     console.log(`Redis running at ${host}:${port}`);
    // 

    //  .withProjectName("flux-e2e")
    //  .withWaitStrategy("portal-redis-e2e", Wait.forLogMessage("Ready to accept connections"))
    // .withExposedService("portal-redis-e2e", 6379) 
    //    .up()        // ['portal-redis-e2e']
    // .withExposedService("portal-redis-e2e", 6350)
    //    ;

    // expect(redisContainer.getConnectionUrl()).toEqual('redis://:e2e-redis-password@localhost:6350');

    console.log('Redis container Started');

    //  const host = 'localhost'; // environment.getHost()
    //  const port = '6350';//  environment.getPort(); // getMappedPort(6379)
    //   const url: string = `redis://:e2e-redis-password@${host}:${port}`;

    console.log({ url });

    redisClient = createClient({
      url, // environment.getConnectionUrl(), // 
    });
    // 
    // expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));



    // const queryResult = await environment.getContainer("portal-redis-e2e").getHost().executeCliCmd("info", ["clients"]);
    // console.log({ queryResult });

    pubsub = new BunRedisPubSub({
      url, // : redisContainer.getConnectionUrl(),// `redis://${host}:${port}`,
      socket: {
        reconnectStrategy: () => 1_000,
      },
    });

    await pubsub.connect();
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient?.disconnect().catch();
    // await pubsub?.disconnect().catch();
    // await redisContainer.stop().catch();
    await pubsub?.disconnect().catch();

    await environment?.down();
  });

  it('works', async () => {
    await redisClient.set('key', 'val');
    expect(await redisClient.get('key')).toBe('val');
  });

  it('should publish and receive messages', async () => {
    const messages: string[] = []

    await pubsub.subscribe('test-channel', messages.push.bind(messages))

    await pubsub.publish('test-channel', 'hello world')

    expect(messages).toContain('hello world')
  })

});