import { Client, Message } from 'paho-mqtt';

export interface MqttConfig {
  brokerUrl: string;
  clientId: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  port?: number;
}

export interface MqttMessage {
  topic: string;
  message: string;
  qos: number;
}

class MqttServiceClass {
  private client: Client | null = null;
  private isConnected = false;
  private subscriptions: Set<string> = new Set();

  /**
   * Initialize and connect to MQTT broker
   */
  async connect(config: MqttConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const host = config.ssl ? 'wss://' : 'ws://';
        const port = config.port || (config.ssl ? 8884 : 9001);
        const brokerUrl = `${host}${config.brokerUrl}:${port}/mqtt`;

        this.client = new Client(brokerUrl, config.clientId);

        // Set event handlers
        this.client.onConnectionLost = (responseObject: any) => {
          console.warn('MQTT connection lost:', responseObject);
          this.isConnected = false;
        };

        this.client.onMessageArrived = (message: Message) => {
          console.log(
            `MQTT message received on ${message.destinationName}: ${message.payloadString}`,
          );
        };

        // Connect options
        const options = {
          onSuccess: () => {
            console.log('MQTT connection established');
            this.isConnected = true;
            resolve();
          },
          onFailure: (error: any) => {
            console.error('MQTT connection failed:', error);
            reject(new Error(`MQTT connection failed: ${error}`));
          },
          useSSL: config.ssl || false,
          userName: config.username,
          password: config.password,
          cleanSession: true,
          reconnect: true,
        };

        this.client.connect(options);
      } catch (error) {
        reject(new Error(`Failed to initialize MQTT client: ${error}`));
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): void {
    if (this.client && this.isConnected) {
      try {
        this.client.disconnect();
        this.isConnected = false;
        this.subscriptions.clear();
      } catch (error) {
        console.error('Error disconnecting from MQTT:', error);
      }
    }
  }

  /**
   * Subscribe to a topic
   */
  subscribe(
    topic: string,
    onMessage: (payload: string) => void,
    options?: { qos?: number },
  ): void {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    try {
      const qos = options?.qos || 0;

      this.client.subscribe(topic, { qos });
      this.subscriptions.add(topic);

      // Store the original onMessageArrived handler and create a new one
      const originalHandler = this.client.onMessageArrived;
      this.client.onMessageArrived = (message: Message) => {
        if (message.destinationName === topic) {
          onMessage(message.payloadString);
        }
        if (originalHandler) {
          originalHandler(message);
        }
      };

      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string): void {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    try {
      this.client.unsubscribe(topic);
      this.subscriptions.delete(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Publish a message to a topic
   */
  publish(
    topic: string,
    payload: string,
    options?: { qos?: number; retain?: boolean },
  ): void {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    try {
      const qos = options?.qos || 0;
      const retain = options?.retain || false;
      const message = new Message(payload);
      message.destinationName = topic;
      message.qos = qos;
      message.retained = retain;

      this.client.send(message);
      console.log(`Published message to ${topic}:`, payload);
    } catch (error) {
      console.error(`Failed to publish to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Get the MQTT client instance
   */
  getClient(): Client | null {
    return this.client;
  }
}

export const mqttService = new MqttServiceClass();
