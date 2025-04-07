import { Job } from 'src/job/entities/job.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Service {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({length: 50})
    name: string;

    @Column({length: 50})
    type: string;

    @Column({length: 50})
    status: string;

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
