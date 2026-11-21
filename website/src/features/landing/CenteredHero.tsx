export const CenteredHero = (props: {
  banner?: React.ReactNode;
  title: React.ReactNode;
  description: string;
  buttons: React.ReactNode;
}) => (
  <>
    {props.banner ? <div className="text-center">{props.banner}</div> : null}

    <h1 className="
      mt-3 text-center text-[2rem] leading-[1.45] font-bold text-balance
      sm:text-4xl sm:leading-[1.4]
      md:text-5xl md:leading-[1.35]
    "
    >
      {props.title}
    </h1>

    <p className="
      mx-auto mt-5 max-w-2xl text-center text-base/8 text-muted-foreground
      md:text-lg/9
    "
    >
      {props.description}
    </p>

    <div className="
      mt-8 flex justify-center gap-x-4 gap-y-3
      max-sm:flex-col
    "
    >
      {props.buttons}
    </div>
  </>
);
