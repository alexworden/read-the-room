import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

export const AttendeeStatus = {
  ENGAGED: 'engaged',
  CONFUSED: 'confused',
  IDEA: 'idea',
  DISAGREE: 'disagree',
} as const;

export type AttendeeStatus = typeof AttendeeStatus[keyof typeof AttendeeStatus];

interface StatusHistoryItem {
  status: AttendeeStatus;
  timestamp: Date;
}

@Entity('attendees')
export class Attendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'text',
    default: AttendeeStatus.ENGAGED
  })
  currentStatus: AttendeeStatus;

  @Column('simple-json', { default: '[]' })
  statusHistory: StatusHistoryItem[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastSeen: Date | null;

  @Column({ type: 'uuid' })
  meetingId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  ensureDatesAreValid() {
    if (this.statusHistory) {
      this.statusHistory = this.statusHistory.map(item => ({
        ...item,
        timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
      }));
    }
  }
}
