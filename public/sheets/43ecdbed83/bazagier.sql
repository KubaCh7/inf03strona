START TRANSACTION;

CREATE TABLE `gry` (
  `id_gry` int(11) NOT NULL,
  `tytul` varchar(100) DEFAULT NULL,
  `id_producenta` int(11) NOT NULL,
  `id_wydawcy` int(11) NOT NULL,
  `gatunek` varchar(50) DEFAULT NULL,
  `data_wydania` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `gry` (`id_gry`, `tytul`, `id_producenta`, `id_wydawcy`, `gatunek`, `data_wydania`) VALUES
(1, 'Wiedźmin 3: Dziki Gon', 1, 1, 'RPG', '2015-05-18'),
(2, 'Cyberpunk 2077', 1, 1, 'RPG', '2020-12-10'),
(3, 'Dying Light 2 Stay Human: Reloaded Edition', 2, 3, 'Akcja, Przygodowe, RPG', '2022-02-04'),
(4, 'Ghostrunner 2', 3, 4, 'Akcja, Przygodowe, Strategie', '2023-10-26'),
(5, 'The Invincible', 6, 5, 'Akcja, Przygodowe, Niezależne', '2023-11-06'),
(6, 'Frostpunk', 4, 5, 'Symulacje, Strategie', '2018-04-24'),
(7, 'Moonlighter', 7, 5, 'Akcja, Przygodowe, Niezależne', '2018-05-29'),
(8, 'Fishing Clash', 5, 2, 'Mobilne', '2017-10-12'),
(9, 'Dead Island: Riptide Definitive Edition', 2, 6, 'Akcja', '2016-05-31'),
(10, 'This War of Mine', 4, 5, 'Przygodowe, Niezależne, Symulacje', '2014-11-14');

CREATE TABLE `producenci` (
  `id_producenta` int(11) NOT NULL,
  `nazwa` varchar(100) NOT NULL,
  `kraj` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `producenci` (`id_producenta`, `nazwa`, `kraj`) VALUES
(1, 'CD PROJEKT RED', 'Polska'),
(2, 'Techland', 'Polska'),
(3, 'One More Level', 'Polska'),
(4, '11 bit studios', 'Polska'),
(5, 'Ten Square Games', 'Polska'),
(6, 'Starward Industries', 'Polska'),
(7, 'Digital Sun', 'Hiszpania'),
(8, 'Deep Silver', 'Austria');

CREATE TABLE `wydawcy` (
  `id_wydawcy` int(11) NOT NULL,
  `nazwa` varchar(100) NOT NULL,
  `kraj` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `wydawcy` (`id_wydawcy`, `nazwa`, `kraj`) VALUES
(1, 'CD PROJEKT RED', 'Polska'),
(2, 'Ten Square Games', 'Polska'),
(3, 'Techland', 'Polska'),
(4, '505 Games', 'Włochy'),
(5, '11 bit studios', 'Polska'),
(6, 'Deep Silver', 'Austria'),
(7, 'Larian Studios', 'Belgia');

ALTER TABLE `gry`
  ADD PRIMARY KEY (`id_gry`),
  ADD KEY `id_producenta` (`id_producenta`),
  ADD KEY `id_wydawcy` (`id_wydawcy`);

ALTER TABLE `producenci`
  ADD PRIMARY KEY (`id_producenta`);

ALTER TABLE `wydawcy`
  ADD PRIMARY KEY (`id_wydawcy`);

ALTER TABLE `gry`
  MODIFY `id_gry` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

ALTER TABLE `producenci`
  MODIFY `id_producenta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

ALTER TABLE `wydawcy`
  MODIFY `id_wydawcy` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

ALTER TABLE `gry`
  ADD CONSTRAINT `gry_ibfk_1` FOREIGN KEY (`id_producenta`) REFERENCES `producenci` (`id_producenta`),
  ADD CONSTRAINT `gry_ibfk_2` FOREIGN KEY (`id_wydawcy`) REFERENCES `wydawcy` (`id_wydawcy`);

COMMIT;