import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { S } from '../strings.ar';
import { EmptyState } from '../ui/States';

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title={S.notFound.title}
      body={S.notFound.body}
      action={(
        <Link to="/" className="inline-flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-primary-fg shadow-sm hover:bg-primary-600">
          {S.notFound.home}
        </Link>
      )}
    />
  );
}
