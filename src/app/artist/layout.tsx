import type { ReactNode } from 'react';

type ArtistLayoutProps = {
  children: ReactNode;
};

export default function ArtistLayout({ children }: ArtistLayoutProps) {
  return <div>{children}</div>;
}

