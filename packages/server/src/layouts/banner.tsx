/** @jsxImportSource ../jsx */
import i18next from "i18next";

export default function Banner() {
  return (
    <div class="banner" role="status">
      {i18next.t("components:banner.text")}
    </div>
  );
}
