import { cn } from '@/utils/Helpers';

export const Section = (props: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  className?: string;
  id?: string;
}) => (
  <div id={props.id} className={cn('@container px-4 py-16', props.className)}>
    {(props.title || props.subtitle || props.description) && (
      <div className="mx-auto mb-12 max-w-3xl text-center">
        {props.subtitle && (
          <div className="text-sm/6 font-bold text-primary">
            {props.subtitle}
          </div>
        )}

        {props.title && (
          <h2 className="
            mt-2 text-2xl leading-[1.45] font-bold text-balance
            md:text-3xl md:leading-[1.4]
          "
          >
            {props.title}
          </h2>
        )}

        {props.description && (
          <p className="
            mt-3 text-base/8 text-muted-foreground
            md:text-lg/8
          "
          >
            {props.description}
          </p>
        )}
      </div>
    )}

    <div className="mx-auto max-w-5xl">{props.children}</div>
  </div>
);
