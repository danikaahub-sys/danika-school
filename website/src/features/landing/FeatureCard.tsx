export const FeatureCard = (props: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border bg-background p-5">
    <div className="
      size-12 rounded-lg bg-primary p-2
      [&_svg]:stroke-primary-foreground [&_svg]:stroke-2
    "
    >
      {props.icon}
    </div>

    <h3 className="mt-4 text-lg/8 font-bold">{props.title}</h3>

    <div className="my-3 w-8 border-t border-primary" />

    <p className="mt-2 text-[0.9375rem]/7 text-muted-foreground">
      {props.children}
    </p>
  </div>
);
