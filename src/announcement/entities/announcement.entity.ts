import { Collaborator } from 'src/collaborator/entities/collaborator.entity';
import { Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  category: string;

  @Column({ length: 50 })
  title: string;

  @Column({ length: 50 })
  typePayment: string;

  @ManyToOne(() => Collaborator, (collaborator) => collaborator.CPF)
  @JoinColumn({ name: 'CPF_collaborator' })
  CPF_Creator: Collaborator;

  @ManyToOne(() => Collaborator, (collaborator) => collaborator.CPF)
  @JoinColumn({ name: 'CPF_collaborator' })
  CPF_Responder: Collaborator;

  @Column({ type: 'longtext', nullable: true })
  candidates: string;

  @Column({ length: 50 })
  typeAnnouncement: string;

  @Column({ length: 250 })
  information: string;

  @Column({ length: 250 })
  included: string;

  @Column({ length: 250 })
  notIncluded: string;

  @Column({ length: 100 })
  salary: string;

  @Column({ length: 50 })
  create_at: string;

  @Column({ length: 50, default: null })
  update_at: string;

  @Column({ length: 50, default: null })
  delete_at: string;
}
