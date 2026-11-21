import { Connection, Client, WorkflowFailedError } from '@temporalio/client';
import { config } from '../config/env';
import { HOTEL_AGGREGATION_WORKFLOW, TEMPORAL_TASK_QUEUE } from './constants';
import { DeduplicatedHotel, WorkflowInput } from '../types/hotel.types';
import { logger } from '../utils/logger';

export class TemporalClientService {
  private static instance: TemporalClientService;
  private client: Client | null = null;
  private connection: Connection | null = null;
  private connecting = false;

  public static getInstance(): TemporalClientService {
    if (!TemporalClientService.instance) {
      TemporalClientService.instance = new TemporalClientService();
    }
    return TemporalClientService.instance;
  }

  public async getClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    if (this.connecting) {
      // Wait for existing connection attempt
      while (this.connecting) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.client) return this.client;
    }

    this.connecting = true;
    try {
      logger.info(`Connecting to Temporal server at ${config.temporal.address}...`);
      this.connection = await Connection.connect({
        address: config.temporal.address,
      });

      this.client = new Client({
        connection: this.connection,
        namespace: config.temporal.namespace,
      });

      logger.info(`Successfully connected to Temporal server (${config.temporal.address})`);
      return this.client;
    } catch (err: any) {
      logger.error(`Failed to connect to Temporal: ${err.message}`);
      throw err;
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Triggers the hotelAggregationWorkflow on Temporal and awaits result.
   */
  public async executeHotelAggregationWorkflow(
    input: WorkflowInput
  ): Promise<DeduplicatedHotel[]> {
    const client = await this.getClient();
    const workflowId = `hotel-agg-${input.city.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    logger.info(`Starting Temporal workflow ${HOTEL_AGGREGATION_WORKFLOW} [ID: ${workflowId}]`, { input });

    try {
      const handle = await client.workflow.start(HOTEL_AGGREGATION_WORKFLOW, {
        taskQueue: config.temporal.taskQueue,
        workflowId,
        args: [input],
      });

      const result = await handle.result();
      logger.info(`Workflow ${workflowId} completed successfully with ${result.length} hotels.`);
      return result;
    } catch (error: any) {
      if (error instanceof WorkflowFailedError) {
        logger.error(`Workflow ${workflowId} failed: ${error.cause?.message || error.message}`);
      } else {
        logger.error(`Error executing workflow ${workflowId}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Health check for Temporal connection.
   */
  public async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const client = await this.getClient();
      await client.workflowService.getSystemInfo({});
      return { healthy: true };
    } catch (err: any) {
      return { healthy: false, error: err.message };
    }
  }
}
