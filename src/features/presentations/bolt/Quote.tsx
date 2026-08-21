import Reveal from './Reveal';

export default function Quote({
  text,
  name,
  role,
  img,
  image,
}: {
  text: string;
  name?: string;
  role?: string;
  img?: string;
  image?: string;
  nav?: string;
  notes?: string;
}) {
  const initials = name
    ? name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <div className="slide center">
      {image && (
        <>
          <img className="cover-img" src={image} alt="" aria-hidden="true" />
          <div className="cover-scrim" aria-hidden="true" />
        </>
      )}
      <Reveal>
        <div className="quote-mark" aria-hidden="true">
          “
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="quote-text">{text}</p>
      </Reveal>
      {name && (
        <Reveal delay={0.16}>
          <div className="quote-attr">
            <span className="quote-ava">
              {img ? <img src={img} alt={name} style={{ width: '100%', height: '100%', borderRadius: 999, objectFit: 'cover' }} /> : initials}
            </span>
            <span className="quote-who">
              <div className="quote-name">{name}</div>
              {role && <div className="quote-role">{role}</div>}
            </span>
          </div>
        </Reveal>
      )}
    </div>
  );
}
