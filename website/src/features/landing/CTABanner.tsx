export const CTABanner = (props: {
  title: string;
  description: string;
  buttons: React.ReactNode;
}) => (
  <div className="
    rounded-xl bg-primary px-6 py-10 text-center
    md:py-12
  "
  >
    <h2 className="
      text-2xl leading-[1.45] font-bold text-balance text-primary-foreground
      md:text-3xl md:leading-[1.4]
    "
    >
      {props.title}
    </h2>

    <p className="
      mx-auto mt-3 max-w-2xl text-base/8 font-medium text-primary-foreground/85
      md:text-lg
    "
    >
      {props.description}
    </p>

    <div className="mt-6">{props.buttons}</div>
  </div>
);
