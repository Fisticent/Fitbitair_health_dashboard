import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="lueur-state-fullscreen">
          <h2>Erreur d&apos;affichage</h2>
          <p>{this.state.error.message}</p>
          <button type="button" className="lueur-btn-sync" onClick={() => window.location.reload()}>
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
