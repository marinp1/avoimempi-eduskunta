DROP TABLE IF EXISTS DocType_asialista;

DROP TABLE IF EXISTS DocType_asiantuntijalausunnon_liite;

DROP TABLE IF EXISTS DocType_asiantuntijalausunto;

DROP TABLE IF EXISTS DocType_asiantuntijasuunnitelma;

DROP TABLE IF EXISTS DocType_asiat_joiden_kasittely_on_paattynyt_valtiopaivilla_xxxx;

DROP TABLE IF EXISTS DocType_asioiden_maara_vaalikausittain;

DROP TABLE IF EXISTS DocType_budjetin_alikohta;

DROP TABLE IF EXISTS DocType_eduskunnan_kirjelma;

DROP TABLE IF EXISTS DocType_eduskunnan_vastaus;

DROP TABLE IF EXISTS DocType_eduskunnassa_vvvv_valtiopaivilla_kasittelyssa_olevat_asiat;

DROP TABLE IF EXISTS DocType_eduskuntatyon_jarjestaminen;

DROP TABLE IF EXISTS DocType_erikoisvaliokunnissa_kasiteltavina_olevat_taysistuntoasiat_ja_niiden_valmistumisarviot;

DROP TABLE IF EXISTS DocType_erikoisvaliokunnissa_kasiteltavana_olevat_eu_asiat;

DROP TABLE IF EXISTS DocType_erikoisvaliokuntien_antamat_lausunnot_ja_kannanotot_u_e_ja_utp_asioista_vaalikaudella;

DROP TABLE IF EXISTS DocType_esityslista;

DROP TABLE IF EXISTS DocType_eun_asiakirjaluonnos;

DROP TABLE IF EXISTS DocType_eun_raportti;

DROP TABLE IF EXISTS DocType_eurooppa_neuvoston_ja_eun_neuvostojen_kokoukset;

DROP TABLE IF EXISTS DocType_hakemisto;

DROP TABLE IF EXISTS DocType_hallituksen_esitys;

DROP TABLE IF EXISTS DocType_ilmoitus_asiantuntijalle;

DROP TABLE IF EXISTS DocType_istuntosuunnitelma;

DROP TABLE IF EXISTS DocType_kannanotto;

DROP TABLE IF EXISTS DocType_kansalaisaloite;

DROP TABLE IF EXISTS DocType_kertomus;

DROP TABLE IF EXISTS DocType_keskustelualoite;

DROP TABLE IF EXISTS DocType_kirjallinen_kysymys;

DROP TABLE IF EXISTS DocType_kirjelma_saadoskokoelmaan;

DROP TABLE IF EXISTS DocType_kokoussuunnitelma;

DROP TABLE IF EXISTS DocType_lakialoite;

DROP TABLE IF EXISTS DocType_lausuma;

DROP TABLE IF EXISTS DocType_lepaamaan_hyvaksytty_lakiehdotus;

DROP TABLE IF EXISTS DocType_liiteasiakirja;

DROP TABLE IF EXISTS DocType_lisaselvitys;

DROP TABLE IF EXISTS DocType_lisatalousarvioaloite;

DROP TABLE IF EXISTS DocType_ministerien_sidonnaisuudet;

DROP TABLE IF EXISTS DocType_ministerion_selvitys;

DROP TABLE IF EXISTS DocType_muu_asia;

DROP TABLE IF EXISTS DocType_muu_asiakirja;

DROP TABLE IF EXISTS DocType_nimenhuutoraportti;

DROP TABLE IF EXISTS DocType_peruuttamisilmoitus;

DROP TABLE IF EXISTS DocType_peruutuskirjelma;

DROP TABLE IF EXISTS DocType_puhemiesneuvoston_ehdotus;

DROP TABLE IF EXISTS DocType_paivajarjestys;

DROP TABLE IF EXISTS DocType_paaministerin_ilmoitus;

DROP TABLE IF EXISTS DocType_poytakirja;

DROP TABLE IF EXISTS DocType_poytakirjan_asiakohta;

DROP TABLE IF EXISTS DocType_poytakirjan_liite;

DROP TABLE IF EXISTS DocType_poytakirjan_muu_asiakohta;

DROP TABLE IF EXISTS DocType_suullinen_kysymys;

DROP TABLE IF EXISTS DocType_suv_asialista;

DROP TABLE IF EXISTS DocType_talousarvioaloite;

DROP TABLE IF EXISTS DocType_tilastotietoja_valiokunnista_valtiopaivilla_xxxx;

DROP TABLE IF EXISTS DocType_toimenpidealoite;

DROP TABLE IF EXISTS DocType_toissijaisuusasia;

DROP TABLE IF EXISTS DocType_toissijaisuusasioiden_lista;

DROP TABLE IF EXISTS DocType_taysistunnon_poytakirjan_paasivu;

DROP TABLE IF EXISTS DocType_taysistunnon_poytakirjat;

DROP TABLE IF EXISTS DocType_unknown;

DROP TABLE IF EXISTS DocType_vaali;

DROP TABLE IF EXISTS DocType_vahvistamatta_jaanyt_laki;

DROP TABLE IF EXISTS DocType_valiokunnan_lausunto;

DROP TABLE IF EXISTS DocType_valiokunnan_mietinto;

DROP TABLE IF EXISTS DocType_valiokunnan_oma_asia;

DROP TABLE IF EXISTS DocType_valiokunnissa_kasiteltavina_olevat_taysistuntoasiat;

DROP TABLE IF EXISTS DocType_valiokuntien_poytakirjat;

DROP TABLE IF EXISTS DocType_valtioneuvostolta_saapuneet_u_asiat_ministerioittain_vaalikaudella_xxxx_yyyy;

DROP TABLE IF EXISTS DocType_valtioneuvoston_e_jatkokirjelma;

DROP TABLE IF EXISTS DocType_valtioneuvoston_e_selvitys;

DROP TABLE IF EXISTS DocType_valtioneuvoston_kirjelma;

DROP TABLE IF EXISTS DocType_valtioneuvoston_selonteko;

DROP TABLE IF EXISTS DocType_valtioneuvoston_tiedonanto;

DROP TABLE IF EXISTS DocType_valtioneuvoston_u_jatkokirjelma;

DROP TABLE IF EXISTS DocType_valtioneuvoston_u_kirjelma;

DROP TABLE IF EXISTS DocType_valtioneuvoston_utp_jatkokirjelma;

DROP TABLE IF EXISTS DocType_valtioneuvoston_utp_selvitys;

DROP TABLE IF EXISTS DocType_vapautuspyynto;

DROP TABLE IF EXISTS DocType_vastaus_kirjalliseen_kysymykseen;

DROP TABLE IF EXISTS DocType_vastaus_saadoskokoelmaan;

DROP TABLE IF EXISTS DocType_vastine;

DROP TABLE IF EXISTS DocType_viikkosuunnitelma;

DROP TABLE IF EXISTS DocType_valikysymys;

CREATE TABLE DocType_asialista (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_asiantuntijalausunnon_liite (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_asiantuntijalausunto (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_asiantuntijasuunnitelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_asiat_joiden_kasittely_on_paattynyt_valtiopaivilla_xxxx (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_asioiden_maara_vaalikausittain (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_budjetin_alikohta (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_eduskunnan_kirjelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_eduskunnan_vastaus (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_eduskunnassa_vvvv_valtiopaivilla_kasittelyssa_olevat_asiat (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_eduskuntatyon_jarjestaminen (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_erikoisvaliokunnissa_kasiteltavina_olevat_taysistuntoasiat_ja_niiden_valmistumisarviot (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_erikoisvaliokunnissa_kasiteltavana_olevat_eu_asiat (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_erikoisvaliokuntien_antamat_lausunnot_ja_kannanotot_u_e_ja_utp_asioista_vaalikaudella (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_esityslista (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_eun_asiakirjaluonnos (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_eun_raportti (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_eurooppa_neuvoston_ja_eun_neuvostojen_kokoukset (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_hakemisto (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_hallituksen_esitys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_ilmoitus_asiantuntijalle (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_istuntosuunnitelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_kannanotto (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_kansalaisaloite (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_kertomus (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_keskustelualoite (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_kirjallinen_kysymys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_kirjelma_saadoskokoelmaan (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_kokoussuunnitelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_lakialoite (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_lausuma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_lepaamaan_hyvaksytty_lakiehdotus (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_liiteasiakirja (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_lisaselvitys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_lisatalousarvioaloite (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_ministerien_sidonnaisuudet (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_ministerion_selvitys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_muu_asia (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_muu_asiakirja (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_nimenhuutoraportti (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_peruuttamisilmoitus (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_peruutuskirjelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_puhemiesneuvoston_ehdotus (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_paivajarjestys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_paaministerin_ilmoitus (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_poytakirja (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_poytakirjan_asiakohta (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_poytakirjan_liite (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_poytakirjan_muu_asiakohta (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_suullinen_kysymys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_suv_asialista (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_talousarvioaloite (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_tilastotietoja_valiokunnista_valtiopaivilla_xxxx (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_toimenpidealoite (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_toissijaisuusasia (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_toissijaisuusasioiden_lista (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_taysistunnon_poytakirjan_paasivu (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_taysistunnon_poytakirjat (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_unknown (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_vaali (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_vahvistamatta_jaanyt_laki (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valiokunnan_lausunto (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valiokunnan_mietinto (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valiokunnan_oma_asia (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valiokunnissa_kasiteltavina_olevat_taysistuntoasiat (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valiokuntien_poytakirjat (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvostolta_saapuneet_u_asiat_ministerioittain_vaalikaudella_xxxx_yyyy (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_e_jatkokirjelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_e_selvitys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_kirjelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_selonteko (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_tiedonanto (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_u_jatkokirjelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_u_kirjelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_utp_jatkokirjelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valtioneuvoston_utp_selvitys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_vapautuspyynto (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_vastaus_kirjalliseen_kysymykseen (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_vastaus_saadoskokoelmaan (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_vastine (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_viikkosuunnitelma (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valikysymys (
  document_id INTEGER PRIMARY KEY,
  title_text TEXT,
  subtitle_text TEXT,
  summary_text TEXT,
  content_text TEXT,
  question_text TEXT,
  answer_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  note_text TEXT,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

