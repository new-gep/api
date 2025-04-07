import { Json } from 'aws-sdk/clients/robomaker';
import { Job } from 'src/job/entities/job.entity';
import { Collaborator } from 'src/collaborator/entities/collaborator.entity';
import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Absence {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({length: 50})
    name: string;

    @Column({length: 50})
    status: string;

    @Column({length: 120})
    observation: string;

    @ManyToOne(() => Collaborator, collaborator => collaborator.CPF)
    @JoinColumn({ name: 'CPF_collaborator' })
    CPF_collaborator: Collaborator;

    @Column()
    @ManyToOne(() => Job, job => job.id)
    @JoinColumn({ name: 'id_work' })
    id_work: Job;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
