import { Company } from 'src/company/entities/company.entity';
import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class User {
    @Column({length: 5, primary: true})
    id: string;

    @Column({length: 50, default:null })
    avatar: string;

    @Column({length: 50})
    user: string;

    @Column({length: 200})
    password: string;

    @Column({length: 150})
    name: string;

    @Column({length: 200})
    email: string;

    @Column({length: 11})
    phone: string;

    @Column({length: 1})
    hierarchy: string;

    @ManyToOne(() => Company, company => company.CNPJ)
    @JoinColumn({ name: 'CNPJ_company' })
    CNPJ_company: Company;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
