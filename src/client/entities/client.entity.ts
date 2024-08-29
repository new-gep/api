import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Client {
    @PrimaryGeneratedColumn()
    CNPJ: string;

    @Column({length: 150})
    company_name: string;

    @Column({length: 150})
    state_registration: string;

    @Column({length: 150})
    municipal_registration: string;

    @Column({length: 150})
    responsible: string;

    @Column({length: 11})
    phone: string;

    @Column({length: 14, default:null})
    CNPJ_company: string;

    @Column({length: 200})
    street: string;

    @Column({length: 150})
    district: string;

    @Column({length: 100})
    city: string;

    @Column({length: 2})
    uf: string;

    @Column()
    number: number;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
