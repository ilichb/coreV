import PanelNavegacion from '../new-panels/PanelNavegacion';
import PanelEcosistema from '../new-panels/PanelEcosistema';
import PanelConstruye from '../new-panels/PanelConstruye';
import PanelDAO from '../new-panels/PanelDAO';
import PanelComunicaciones from '../new-panels/PanelComunicaciones';
import PanelLegal from '../new-panels/PanelLegal';
import PanelSistema from '../new-panels/PanelSistema';

export default function AndromedaMode() {
  return (
    <>
      {/* Renderizamos los 7 paneles en orden */}
      <PanelNavegacion />
      <PanelEcosistema />
      <PanelConstruye />
      <PanelDAO />
      <PanelComunicaciones />
      <PanelLegal />
      <PanelSistema />
    </>
  );
}
