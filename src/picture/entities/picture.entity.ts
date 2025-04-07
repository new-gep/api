import { Collaborator } from 'src/collaborator/entities/collaborator.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Picture {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 50,})
    picture: string;

    @Column({length: 20,})
    status: string;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({ name: 'id_user' })
    id_user: User;

    @ManyToOne(() => Collaborator, collaborator => collaborator.CPF)
    @JoinColumn({ name: 'CPF_collaborator' })
    CPF_collaborator: Collaborator;


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
