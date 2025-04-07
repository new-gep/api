import { Json } from 'aws-sdk/clients/robomaker';
import { Company } from 'src/company/entities/company.entity';
import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Payment {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({length: 200})
    cel_cash_id: string;

    @ManyToOne(() => Company, company => company.CNPJ)
    @JoinColumn({ name: 'CNPJ_company' })
    CNPJ_Company: Company;

    @Column({length: 50})
    method: string;

    @Column({length: 50})
    status: string;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
