import { TopBar }       from './top-bar';
import { LeftColumn }   from './left-column';
import { CenterColumn } from './center-column';
import { RightColumn }  from './right-column';
import { BottomBar }    from './bottom-bar';

export function AppShell({ children }: { children?: React.ReactNode }) {
  // children is a slot for dashboard page content injected by Next.js route segments
  // Currently unused by placeholder pages — will be used in Tanda 3C
  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateColumns: '280px 1fr 360px',
        gridTemplateRows: '56px 1fr 44px',
      }}
    >
      <TopBar />
      <LeftColumn />
      <CenterColumn />
      <RightColumn />
      <BottomBar />
      {children}
    </div>
  );
}
