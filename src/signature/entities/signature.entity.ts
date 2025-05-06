import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Collaborator } from "src/collaborator/entities/collaborator.entity";
import { Job } from "src/job/entities/job.entity";
import { User } from "src/user/entities/user.entity";
@Entity()
export class Signature {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Collaborator, collaborator => collaborator.CPF)
    @JoinColumn({ name: 'CPF_collaborator' })
    cpf_collaborator: Collaborator;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({ name: 'id_user' })
    id_user: User;

    @ManyToOne(() => Job, job => job.id)
    @JoinColumn({ name: 'id_job' })
    id_job: Job;

    @Column({length: 50})
    ip: string;

    @Column({length: 50})
    document: string;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, nullable:true})
    update_at: string;

}
