import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      visibleToasts={3}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-warm-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-[hsl(var(--brand-green))]",
          error:
            "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-destructive",
          info:
            "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-primary",
          warning:
            "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-[hsl(var(--brand-yellow))]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
