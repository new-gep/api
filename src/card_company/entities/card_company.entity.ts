import { Company } from 'src/company/entities/company.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class CardCompany {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 200,})
    name: string;

    @Column({length: 200,})
    number: string;

    @Column({length: 200,})
    cvc: string;

    @Column({length: 200,})
    expiry: string;

    @ManyToOne(() => Company, company => company.CNPJ)
    @JoinColumn({ name: 'CNPJ_company' })
    CNPJ: Company;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({ name: 'user_create' })
    user_create: User;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({ name: 'user_update' })
    user_update: User;

    @Column({length: 50,})
    created_at: string;

    @Column({length: 50, default:null })
    updated_at: string;

    @Column({length: 50, default:null })
    deleted_at: string;
}
