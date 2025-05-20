import { Collaborator } from 'src/collaborator/entities/collaborator.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity()
export class Cv {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'longtext' })
  education: string;

  @Column({ type: 'longtext' })
  experience: string;

  @Column({ type: 'longtext', default: null })
  skills: string;

  @ManyToOne(() => Collaborator, (collaborator) => collaborator.CPF, { nullable: false })
  @JoinColumn({ name: 'CPF_collaborator', referencedColumnName: 'CPF' })
  CPF_collaborator: Collaborator;

  @Column({ length: 50 })
  create_at: string;

  @Column({ length: 50, default: null })
  update_at: string;

  @Column({ length: 50, default: null })
  delete_at: string;
}
