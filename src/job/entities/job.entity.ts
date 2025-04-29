import { Json } from 'aws-sdk/clients/robomaker';
import { Collaborator } from 'src/collaborator/entities/collaborator.entity';
import { Company } from 'src/company/entities/company.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Job {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 1, default:'0' })
    PCD: string;

    @Column({length: 1, default:'0' })
    DEI: string;

    @Column({length: 8})
    cep: string;

    @Column({length: 50})
    image: string;

    @Column({length: 200})
    locality: string;

    @Column({length: 20})
    contract: string;

    @Column({length: 50})
    model: string;

    @Column({length: 50})
    function: string;

    @Column({length: 50})
    salary: string;

    @Column({ type: 'longtext', nullable: true })
    demission: string;

    @Column({length: 200, default:null })
    motion_demission: string;

    @Column({ type: 'longtext', nullable: true })
    candidates: string;

    @Column({type: 'longtext'})
    requirements: string;

    @Column({type: 'longtext'})
    responsibility: string;

    @Column({ type: 'longtext', nullable: true })
    benefits: string;

    @Column({ type: 'longtext', nullable: true })
    skills: string;

    @ManyToOne(() => Company, company => company.CNPJ)
    @JoinColumn({ name: 'CNPJ_company' })
    CNPJ_company: Company;

    @ManyToOne(() => Collaborator, collaborator => collaborator.CPF)
    @JoinColumn({ name: 'CPF_collaborator' })
    CPF_collaborator: Collaborator;
   
    @ManyToOne(() => User, user => user.id)
    @JoinColumn({ name: 'user_create' })
    user_create: User;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({ name: 'user_edit' })
    user_edit: User;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
