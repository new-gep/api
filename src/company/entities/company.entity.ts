import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Company {
    @Column({length: 14, primary: true})
    CNPJ: string;

    @Column({length: 150})
    company_name: string;

    @Column({length: 1, default : '0'})
    isVisible: string;

    @Column({length: 200})
    email: string;

    @Column({length: 10})
    type_account: string;

    @Column({length: 150, default: null})
    state_registration: string;

    @Column({length: 150, default:null} )
    municipal_registration: string;

    @Column({length: 150})
    responsible: string;

    @Column({length: 11})
    phone: string;

    @Column({length: 8})
    zip_code: string;

    @Column({length: 200})
    street: string;

    @Column({length: 150})
    district: string;

    @Column({length: 100})
    city: string;

    @Column({length: 2})
    uf: string;

    @Column({length: 50, default: null})
    state: string;

    @Column()
    number: number;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
