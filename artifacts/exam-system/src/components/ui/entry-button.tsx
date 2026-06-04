import "./entry-button.css";

interface EntryButtonProps {
  text: string;
  onClick?: () => void;
}

export function EntryButton({ text, onClick }: EntryButtonProps) {
  return (
    <button className="entry-button" onClick={onClick}>
      <div className="entry-button__line"></div>
      <div className="entry-button__line"></div>
      <span className="entry-button__text">{text}</span>
      <div className="entry-button__drow1"></div>
      <div className="entry-button__drow2"></div>
    </button>
  );
}
