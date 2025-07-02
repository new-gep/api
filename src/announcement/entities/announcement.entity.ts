import { Collaborator } from 'src/collaborator/entities/collaborator.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  category: string;

  @Column({ length: 50 })
  title: string;

  @Column({ length: 50 })
  typePayment: string;

  @ManyToOne(() => Collaborator, (collaborator) => collaborator.CPF, { nullable: false })
  @JoinColumn({ name: 'CPF_creator' })
  CPF_Creator: Collaborator;

  @ManyToOne(() => Collaborator, (collaborator) => collaborator.CPF, { nullable: true })
  @JoinColumn({ name: 'CPF_responder' })
  CPF_Responder?: Collaborator;

  @Column({ type: 'longtext', nullable: true })
  candidates: string;

  @Column({ length: 50 })
  typeAnnouncement: string;

  @Column({ length: 250, nullable: true })
  information: string;

  @Column({ length: 250 })
  included: string;

  @Column({ length: 250, nullable: true  })
  notIncluded: string;

  @Column({ length: 100 , nullable: true })
  salary: string;

  @Column({ length: 50 })
  create_at: string;

  @Column({ length: 50, nullable: true })
  update_at: string;

  @Column({ length: 50, nullable: true })
  delete_at: string;
}
