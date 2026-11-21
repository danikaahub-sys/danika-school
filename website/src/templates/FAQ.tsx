import { useTranslations } from 'next-intl';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Section } from '@/features/landing/Section';

const QUESTION_IDS = ['1', '2', '3', '4', '5'] as const;

export const FAQ = () => {
  const t = useTranslations('FAQ');

  return (
    <Section id="faq">
      <Accordion type="multiple" className="w-full">
        {QUESTION_IDS.map(id => (
          <AccordionItem key={id} value={`item-${id}`}>
            <AccordionTrigger className="
              text-base/8
              md:text-lg/8
            "
            >
              {t(`q${id}`)}
            </AccordionTrigger>
            <AccordionContent className="text-[0.9375rem]/8">
              {t(`a${id}`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
};
