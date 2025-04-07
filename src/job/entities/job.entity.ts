import { Json } from 'aws-sdk/clients/robomaker';
import { Collaborator } from 'src/collaborator/entities/collaborator.entity';
import { Company } from 'src/company/entities/company.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Job {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 1})
    PCD: string;

    @Column({length: 50})
    image: string;

    @Column({length: 50})
    function: string;

    @Column({length: 50})
    salary: string;

    @Column({length: 1, default:null })
    demission: string;

    @Column({length: 50, default:null })
    motion_demission: string;

    @Column()
    time: Json;

    @Column()
    candidates: string;

    @Column({length: 1})
    transportation_voucher: string;

    @Column({length: 20})
    contract: string;

    @Column({length: 255})
    details: string;

    @Column({length: 255})
    obligations: string;

    @Column({length: 255})
    benefits: string;

    @ManyToOne(() => Company, company => company.CNPJ)
    @JoinColumn({ name: 'CNPJ_company' })
    CNPJ_company: string;

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
