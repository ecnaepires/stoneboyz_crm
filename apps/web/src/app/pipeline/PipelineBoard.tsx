'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CalendarDays, CalendarPlus } from 'lucide-react';
import type { PipelineStage } from '@stoneboyz/domain';
import { Button } from '@/components/ui/button';
import { buildScheduleHref, nextAppointmentTypeForPipelineStage } from '@/lib/schedule-links';
import { resolveStageDrop } from './stage-drop';
import { setProjectStageAction } from './_actions';

export interface PipelineCard {
  id: string;
  jobNumber: string;
  title: string;
  city: string | null;
  pipelineStage: PipelineStage;
  daysInStage: number;
  ownerUserId: string;
  customerId: string;
  customerName: string;
  nextAppointment: { appointmentType: string | null; scheduledAt: string } | null;
  quoteValueCents: number;
  squareFeet: number;
  openIssueCount: number;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: 'New / Lead',
  deposit: 'Deposit',
  template: 'Template',
  material: 'Material',
  fabrication: 'Fabrication',
  install: 'Install',
  invoice: 'Invoice',
  done: 'Done',
};

const formatDollars = (cents: number): string =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const labelize = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export function PipelineBoard({ cards, stages }: { cards: PipelineCard[]; stages: readonly PipelineStage[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragged, setDragged] = useState<{ id: string; from: PipelineStage } | null>(null);

  const move = (projectId: string, to: PipelineStage, allowBackward: boolean) => {
    startTransition(async () => {
      const result = await setProjectStageAction(projectId, to, allowBackward);
      if (result.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  const handleDrop = (to: PipelineStage) => {
    if (dragged === null) {
      return;
    }
    const { id, from } = dragged;
    setDragged(null);

    const drop = resolveStageDrop(from, to);
    if (drop.kind === 'noop') {
      return;
    }
    if (drop.kind === 'backward') {
      const confirmed = window.confirm(
        `Move ${STAGE_LABELS[from]} -> ${STAGE_LABELS[to]}? This moves the job backward.`,
      );
      if (!confirmed) {
        return;
      }
      move(id, to, true);
      return;
    }
    move(id, to, false);
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Pipeline</h1>
        {isPending && <span className='text-sm text-muted-foreground'>Saving...</span>}
      </div>
      {error && (
        <div className='rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700'>{error}</div>
      )}
      <div className='flex gap-3 overflow-x-auto pb-4'>
        {stages.map((stage) => {
          const stageCards = cards.filter((card) => card.pipelineStage === stage);
          return (
            <div
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(stage)}
              className='flex w-64 shrink-0 flex-col rounded-md bg-muted/40 p-2'
            >
              <div className='mb-2 flex items-center justify-between px-1 text-sm font-medium'>
                <span>{STAGE_LABELS[stage]}</span>
                <span className='text-muted-foreground'>{stageCards.length}</span>
              </div>
              <div className='space-y-2'>
                {stageCards.length === 0 && <p className='px-1 text-xs text-muted-foreground'>No jobs</p>}
                {stageCards.map((card) => {
                  const nextAppointmentType = nextAppointmentTypeForPipelineStage(card.pipelineStage);
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDragged({ id: card.id, from: card.pipelineStage })}
                      onDragEnd={() => setDragged(null)}
                      className='cursor-grab rounded-md border bg-background p-2 text-xs shadow-sm active:cursor-grabbing'
                    >
                      <Link href={`/projects/${card.id}`} className='font-semibold hover:underline'>
                        {card.jobNumber} - {card.customerName}
                      </Link>
                      <div className='text-muted-foreground'>{card.title}</div>
                      {card.city && <div className='text-muted-foreground'>{card.city}</div>}
                      {card.nextAppointment && (
                        <div className='mt-1 flex items-center gap-1'>
                          <CalendarDays className='size-3 shrink-0' aria-hidden='true' />
                          <span>
                            {card.nextAppointment.appointmentType ?? 'Appt'} -{' '}
                            {formatDate(card.nextAppointment.scheduledAt)}
                          </span>
                        </div>
                      )}
                      <div className='mt-1 flex flex-wrap gap-x-2 text-muted-foreground'>
                        <span>{formatDollars(card.quoteValueCents)}</span>
                        <span>{card.squareFeet} sq ft</span>
                        <span>{card.daysInStage}d in stage</span>
                        {card.openIssueCount > 0 && (
                          <span className='inline-flex items-center gap-1 text-red-600'>
                            <AlertTriangle className='size-3' aria-hidden='true' />
                            {card.openIssueCount}
                          </span>
                        )}
                      </div>
                      {nextAppointmentType && (
                        <Button asChild variant='outline' size='sm' className='mt-2 h-7 w-full justify-start px-2 text-xs'>
                          <Link
                            href={buildScheduleHref({
                              customerId: card.customerId,
                              projectId: card.id,
                              appointmentType: nextAppointmentType,
                            })}
                          >
                            <CalendarPlus className='mr-1 size-3' aria-hidden='true' />
                            Schedule {labelize(nextAppointmentType)}
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
