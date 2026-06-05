import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateDamageMarkInput, DamageMark, SlabAuditEvent } from '@stoneboyz/domain';
import { InventorySupportRepository } from './inventory-support.repository.js';
import { SlabsRepository } from './slabs.repository.js';

@Injectable()
export class InventorySupportService {
  constructor(
    private readonly inventorySupportRepository: InventorySupportRepository,
    private readonly slabsRepository: SlabsRepository
  ) {}

  async createDamageMark(slabId: string, input: CreateDamageMarkInput): Promise<DamageMark> {
    const slab = await this.slabsRepository.findById(slabId);

    if (slab === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
    }

    return this.inventorySupportRepository.createDamageMark(slabId, input);
  }

  async listDamageMarks(slabId: string): Promise<DamageMark[]> {
    return this.inventorySupportRepository.listDamageMarks(slabId);
  }

  async listAuditEvents(slabId: string): Promise<SlabAuditEvent[]> {
    return this.inventorySupportRepository.listAuditEvents(slabId);
  }

  async listMaterialColors() {
    return this.inventorySupportRepository.listMaterialColors();
  }

  async createMaterialColor(name: string) {
    return this.inventorySupportRepository.createMaterialColor(name);
  }

  async listStorageLocations() {
    return this.inventorySupportRepository.listStorageLocations();
  }

  async createStorageLocation(input: { zone: string; rack: string; bin?: string | undefined; slot?: string | undefined; notes?: string | undefined }) {
    return this.inventorySupportRepository.createStorageLocation(input);
  }

  async listReceipts() {
    return this.inventorySupportRepository.listReceipts();
  }

  async createReceipt(input: { vendor?: string | undefined; notes?: string | undefined; actorUserId: string }) {
    return this.inventorySupportRepository.createReceipt(input);
  }
}
