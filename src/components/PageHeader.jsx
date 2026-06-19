export default function PageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 ring-1 ring-inset ring-primary/10 shadow-sm">
            <Icon size={20} className="text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[22px] md:text-2xl font-heading font-bold text-foreground tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
