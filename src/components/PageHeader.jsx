export default function PageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}