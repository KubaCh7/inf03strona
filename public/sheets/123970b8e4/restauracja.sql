-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Lip 01, 2024 at 02:02 PM
-- Wersja serwera: 10.4.28-MariaDB
-- Wersja PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `Restauracja`
--

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `Kelnerzy`
--

CREATE TABLE `Kelnerzy` (
  `id` int(11) NOT NULL,
  `imie` varchar(45) NOT NULL,
  `nazwisko` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Kelnerzy`
--

INSERT INTO `Kelnerzy` (`id`, `imie`, `nazwisko`) VALUES
(1, 'Jan', 'Kowalski'),
(2, 'Anna', 'Nowak'),
(3, 'Piotr', 'Wiśniewski');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `Potrawy`
--

CREATE TABLE `Potrawy` (
  `id` int(11) NOT NULL,
  `nazwa` varchar(255) NOT NULL,
  `cena` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Potrawy`
--

INSERT INTO `Potrawy` (`id`, `nazwa`, `cena`) VALUES
(1, 'Penne z kurczakiem', 27.50),
(2, 'Spaghetti Carbonara', 30.00),
(3, 'Tiramisu', 15.00),
(4, 'Zupa minestrone', 17.50),
(5, 'Spaghetti bolognese', 35.00),
(6, 'Pizza Margherita', 25.50);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `Stoliki`
--

CREATE TABLE `Stoliki` (
  `id` int(11) NOT NULL,
  `sala` int(11) NOT NULL,
  `numerStolika` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Stoliki`
--

INSERT INTO `Stoliki` (`id`, `sala`, `numerStolika`) VALUES
(1, 1, 1),
(2, 1, 2),
(3, 1, 3),
(4, 1, 4),
(5, 1, 5),
(6, 2, 1),
(7, 2, 2);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `Zamowienia`
--

CREATE TABLE `Zamowienia` (
  `id` int(11) NOT NULL,
  `idKelnera` int(11) NOT NULL,
  `idStolika` int(11) NOT NULL,
  `dataZlozenia` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Zamowienia`
--

INSERT INTO `Zamowienia` (`id`, `idKelnera`, `idStolika`, `dataZlozenia`) VALUES
(1, 1, 1, '2024-06-10 12:00:00'),
(2, 2, 2, '2024-06-10 13:00:00'),
(3, 3, 3, '2024-06-10 14:00:00'),
(4, 2, 3, '2024-06-10 12:30:00'),
(5, 1, 6, '2024-06-09 14:30:00');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `ZamowieniaPotrawy`
--

CREATE TABLE `ZamowieniaPotrawy` (
  `id` int(11) NOT NULL,
  `idPotrawy` int(11) NOT NULL,
  `idZamowienia` int(11) NOT NULL,
  `ilosc` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ZamowieniaPotrawy`
--

INSERT INTO `ZamowieniaPotrawy` (`id`, `idPotrawy`, `idZamowienia`, `ilosc`) VALUES
(1, 1, 1, 2),
(2, 2, 1, 1),
(3, 3, 2, 3),
(4, 4, 2, 1),
(5, 1, 3, 1),
(6, 6, 4, 1),
(7, 5, 5, 2);

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `Kelnerzy`
--
ALTER TABLE `Kelnerzy`
  ADD PRIMARY KEY (`id`);

--
-- Indeksy dla tabeli `Potrawy`
--
ALTER TABLE `Potrawy`
  ADD PRIMARY KEY (`id`);

--
-- Indeksy dla tabeli `Stoliki`
--
ALTER TABLE `Stoliki`
  ADD PRIMARY KEY (`id`);

--
-- Indeksy dla tabeli `Zamowienia`
--
ALTER TABLE `Zamowienia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `zamowienie_ibfk_1` (`idKelnera`),
  ADD KEY `IdStolika` (`idStolika`);

--
-- Indeksy dla tabeli `ZamowieniaPotrawy`
--
ALTER TABLE `ZamowieniaPotrawy`
  ADD PRIMARY KEY (`id`),
  ADD KEY `IdPotrawy` (`idPotrawy`),
  ADD KEY `IdZamowienia` (`idZamowienia`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Kelnerzy`
--
ALTER TABLE `Kelnerzy`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `Potrawy`
--
ALTER TABLE `Potrawy`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `Stoliki`
--
ALTER TABLE `Stoliki`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `Zamowienia`
--
ALTER TABLE `Zamowienia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `Zamowienia`
--
ALTER TABLE `Zamowienia`
  ADD CONSTRAINT `zamowienie_ibfk_1` FOREIGN KEY (`IdKelnera`) REFERENCES `Kelnerzy` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `zamowienie_ibfk_2` FOREIGN KEY (`IdStolika`) REFERENCES `Stoliki` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ZamowieniaPotrawy`
--
ALTER TABLE `ZamowieniaPotrawy`
  ADD CONSTRAINT `zamowieniapotrawy_ibfk_1` FOREIGN KEY (`IdPotrawy`) REFERENCES `Potrawy` (`Id`),
  ADD CONSTRAINT `zamowieniapotrawy_ibfk_2` FOREIGN KEY (`IdZamowienia`) REFERENCES `Zamowienia` (`Id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
