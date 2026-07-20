// Маскот-логотип GELATO: рожок фро-йо — плоская иконка вместо псевдо-лого
export function GelatoLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      {/* стаканчик: волна делит его на бирюзовую и розовую половины, кружок-логотип спереди */}
      <path
        d="M11 24H29L27 34C26.7 35.7 25.2 37 23.5 37H16.5C14.8 37 13.3 35.7 13 34L11 24Z"
        fill="oklch(0.72 0.13 190)"
      />
      <path
        d="M12.3 30.5C15 29 18 32 20 30.5C22 29 25 32 27.7 30.5L27 34C26.7 35.7 25.2 37 23.5 37H16.5C14.8 37 13.3 35.7 13 34L12.3 30.5Z"
        fill="oklch(0.72 0.17 350)"
      />
      <circle cx="20" cy="27.5" r="2.6" fill="white" />
      <circle cx="20" cy="27.5" r="1.3" fill="oklch(0.68 0.22 355)" />

      {/* три шарика фро-йо: сливочный, розовый, карамельный */}
      <ellipse cx="20" cy="22.5" rx="10.5" ry="3.2" fill="oklch(0.94 0.02 90)" />
      <path
        d="M9.5 22.5C9.5 17.5 14 14 20 14C26 14 30.5 17.5 30.5 22.5"
        fill="oklch(0.94 0.02 90)"
      />
      <path
        d="M11 19.5C11.5 15.5 15 12.5 19.3 12.3C24 12 27.8 15 28.7 19"
        fill="oklch(0.78 0.16 350)"
      />
      <path
        d="M12.3 16.2C13.5 13 16.5 10.7 19.7 10.6C23.2 10.5 26.2 12.7 27.4 15.8"
        fill="oklch(0.72 0.1 65)"
      />

      {/* вишенка с хвостиком */}
      <path d="M19.5 8.5C19 7 19.8 5.5 21 5" stroke="oklch(0.6 0.13 145)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="20" cy="9.5" r="2.3" fill="oklch(0.6 0.2 25)" />

      {/* лёгкие блики */}
      <circle cx="15" cy="18.5" r="1.1" fill="white" opacity="0.7" />
      <circle cx="24.5" cy="21" r="0.9" fill="white" opacity="0.6" />
    </svg>
  );
}
