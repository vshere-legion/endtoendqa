import { APIRequestContext, APIResponse, expect } from '@playwright/test';

export class BaseAPI {
  constructor(protected request: APIRequestContext, protected baseURL: string) {}

  protected getHeaders() {
    return {
      Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async get(endpoint: string): Promise<APIResponse> {
    return await this.request.get(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(),
    });
  }

  async post(endpoint: string, data: any): Promise<APIResponse> {
    return await this.request.post(`${this.baseURL}${endpoint}`, {
      data,
      headers: this.getHeaders(),
    });
  }

  async delete(endpoint: string): Promise<APIResponse> {
    return await this.request.delete(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(),
    });
  }
}