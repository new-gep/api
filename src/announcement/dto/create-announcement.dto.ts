export class CreateAnnouncementDto {
  category: string;
  title: string;
  typePayment: string;
  typeAnnouncement: string;
  salary?: string;
  included: string;
  notIncluded?: string;
  information?: string;
  create_at:string;
}
